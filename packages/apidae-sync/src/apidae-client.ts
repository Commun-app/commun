import { DateTime, Info } from 'luxon';
import { consola } from 'consola';

// Portage du client APIDAE du job-data-sync legacy, réduit à la collecte
// paginée + les deux transforms statiques (périodes, médias). HTTPS par défaut
// (le legacy interrogeait l'API en HTTP clair).
const DEFAULT_BASE_URL = 'https://api.apidae-tourisme.com/api';
const BATCH_SIZE = 20;
const REQUEST_TIMEOUT_MS = 60_000;

const WEEKDAYS_LONG_FORMAT = Info.weekdays('long', { locale: 'fr' });
// Correctif legacy : le job concaténait `+ 1` sur ces chaînes ("FIRST1"…).
const PERIODRANKS_LONG_FORMAT: Record<string, string> = {
  D_1ER: 'FIRST',
  D_2EME: 'SECOND',
  D_3EME: 'THIRD',
  D_4EME: 'FOURTH',
  D_DERNIER: 'LAST',
};

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
};

export interface ApidaeMediaRef {
  originalName: string;
  originalUrl: string;
  mime: string;
  metaData: { apidaeId: string; logo: boolean; header: boolean };
}

export interface ApidaePeriod {
  periodicity: 'UNIQUE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined;
  weekDays: Array<{ day: number; periodRank?: string }>;
  fromDate: string | null;
  toDate: string | null;
}

export interface ApidaeSchedules {
  summary: string | undefined;
  periods: ApidaePeriod[];
}

export interface ApidaeCredentials {
  apiKey?: string;
  projectId?: string;
}

export interface ApidaeClientOptions {
  credentials: ApidaeCredentials;
  selectionIds: unknown[];
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

// biome-ignore lint/suspicious/noExplicitAny: portage du moteur legacy non typé — accès dynamiques aux payloads APIDAE
type LooseDoc = Record<string, any>;

export class ApidaeClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly credentials: ApidaeCredentials;
  private readonly selectionIds: unknown[];

  constructor(options: ApidaeClientOptions) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.credentials = options.credentials;
    this.selectionIds = options.selectionIds;
  }

  /**
   * Iso legacy `transformMedia` : extrait la traduction `fr` de chaque
   * illustration. Correctif : une illustration sans traduction fr est ignorée
   * avec un log (le legacy levait une TypeError sur tout l'objet).
   */
  static transformMedia(apidaeMedia: LooseDoc[] = []): ApidaeMediaRef[] {
    const media: ApidaeMediaRef[] = [];
    for (const { traductionFichiers = [], identifiant, legende } of apidaeMedia) {
      const translation = (traductionFichiers as LooseDoc[]).find(({ locale }) => locale === 'fr');
      if (!translation) {
        consola.warn(`[apidae-sync] illustration ${identifiant} sans traduction fr — ignorée`);
        continue;
      }
      const { url, extension, fileName } = translation;
      const caption: string = legende?.libelleFr?.toLowerCase() ?? '';
      media.push({
        originalName: `${fileName}.${extension}`,
        originalUrl: url,
        mime: EXT_TO_MIME[String(extension).toLowerCase()] ?? 'application/octet-stream',
        metaData: {
          apidaeId: String(identifiant),
          logo: caption.includes('logo'),
          header: caption.includes('header') || caption.includes('cover'),
        },
      });
    }
    return media;
  }

  /**
   * Iso legacy `transformSchedules` (périodes d'ouverture APIDAE, doc :
   * dev.apidae-tourisme.com …/periodes-douverture/) — zone Europe/Paris.
   * Correctifs : `now` est fourni par l'appelant (le legacy figeait la date à
   * l'import du module), `periodRank` vaut FIRST…LAST (le legacy produisait
   * "FIRST1" par concaténation), dates sérialisées en ISO 8601 (le legacy
   * laissait transiter des objets luxon).
   */
  static transformSchedules(
    apidaeSchedule: LooseDoc | undefined,
    now: DateTime = DateTime.local({ zone: 'Europe/Paris' }),
  ): ApidaeSchedules {
    const periods: Array<
      Omit<ApidaePeriod, 'fromDate' | 'toDate'> & {
        fromDate: DateTime;
        toDate: DateTime;
      }
    > = [];

    for (const apidaePeriod of apidaeSchedule?.periodesOuvertures ?? []) {
      let periodicity: ApidaePeriod['periodicity'];
      let weekDays: ApidaePeriod['weekDays'] = [];
      let fromDate = DateTime.fromFormat(apidaePeriod.dateDebut, 'yyyy-MM-dd', {
        zone: 'Europe/Paris',
      });
      let toDate = DateTime.fromFormat(apidaePeriod.dateFin, 'yyyy-MM-dd', {
        zone: 'Europe/Paris',
      });

      // Iso legacy : une période "tousLesAns" est rebasée sur l'année courante.
      if (apidaePeriod.tousLesAns) {
        fromDate = fromDate.set({ year: now.year, month: now.month, day: now.day });
        toDate = toDate.set({ year: now.year + 1 });
      }

      if (apidaePeriod.horaireOuverture) {
        const [hour, minute] = apidaePeriod.horaireOuverture.split(':');
        fromDate = fromDate.set({ hour: +hour, minute: +minute });
      }
      if (apidaePeriod.horaireFermeture) {
        const [hour, minute] = apidaePeriod.horaireFermeture.split(':');
        toDate = toDate.set({ hour: +hour, minute: +minute });
      }

      if ((toDate.diff(fromDate, 'days')?.toObject()?.days ?? 0) < 2) {
        periodicity = 'UNIQUE';
      } else {
        switch (apidaePeriod.type) {
          case 'OUVERTURE_TOUS_LES_JOURS':
            periodicity = 'DAILY';
            break;

          // Tous les jours SAUF ceux de `ouverturesJournalieres` (vide = DAILY).
          case 'OUVERTURE_SAUF':
            periodicity = 'DAILY';
            if (apidaePeriod.ouverturesJournalieres?.length) {
              periodicity = 'WEEKLY';
              weekDays = WEEKDAYS_LONG_FORMAT.filter((weekDay) =>
                apidaePeriod.ouverturesJournalieres?.every(
                  ({ jour }: LooseDoc) => jour.toLowerCase() !== weekDay,
                ),
              ).map((weekDay) => ({
                day: WEEKDAYS_LONG_FORMAT.indexOf(weekDay) + 1,
              }));
            }
            break;

          // Seulement les jours de `ouverturesJournalieres` (7 jours = DAILY).
          case 'OUVERTURE_SEMAINE':
            periodicity = 'DAILY';
            if (apidaePeriod.ouverturesJournalieres?.length !== 7) {
              periodicity = 'WEEKLY';
              weekDays = (apidaePeriod.ouverturesJournalieres ?? []).map(({ jour }: LooseDoc) => ({
                day:
                  WEEKDAYS_LONG_FORMAT.findIndex(
                    (day) => day.toLowerCase() === jour.toLowerCase(),
                  ) + 1,
              }));
            }
            break;

          case 'OUVERTURE_MOIS':
            periodicity = 'MONTHLY';
            weekDays = (apidaePeriod.ouverturesJourDuMois ?? []).map(
              ({ jourDuMois, jour }: LooseDoc) => ({
                periodRank: PERIODRANKS_LONG_FORMAT[jourDuMois],
                day:
                  WEEKDAYS_LONG_FORMAT.findIndex(
                    (day) => day.toLowerCase() === jour.toLowerCase(),
                  ) + 1,
              }),
            );
            break;
        }
      }
      periods.push({ periodicity, weekDays, fromDate, toDate });
    }

    // Iso legacy : un objet dont TOUTES les périodes sont finies depuis plus
    // d'un mois est rejeté — jamais écrit, donc dépublié par le mode unlink.
    if (periods.length && periods.every(({ toDate }) => toDate <= now.minus({ months: 1 }))) {
      throw new Error('E_EVENT_EXPIRED');
    }

    return {
      summary: apidaeSchedule?.periodeEnClair?.libelleFr,
      periods: periods.map((period) => ({
        ...period,
        fromDate: period.fromDate.toISO(),
        toDate: period.toDate.toISO(),
      })),
    };
  }

  /**
   * Collecte paginée iso legacy `asyncFindSelections` : lots de 20 sur
   * `list-objets-touristiques`, arrêt sur page vide. Une erreur (réseau ou
   * statut non-2xx) interrompt la collecte et est remontée à l'appelant.
   */
  async *collect(): AsyncGenerator<{ value?: LooseDoc; error?: unknown }> {
    let from = 0;
    while (true) {
      try {
        const query = {
          responseFields: ['@all'],
          projetId: this.credentials.projectId,
          apiKey: this.credentials.apiKey,
          selectionIds: this.selectionIds,
          first: from,
          count: BATCH_SIZE,
        };
        const response = await this.fetchImpl(
          `${this.baseUrl}/v002/recherche/list-objets-touristiques?query=${encodeURIComponent(
            JSON.stringify(query),
          )}`,
          { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
        );
        if (!response.ok) {
          throw new Error(`APIDAE ${response.status} ${response.statusText}`);
        }
        const results = (await response.json()) as LooseDoc;
        if (!results?.objetsTouristiques?.length) {
          break;
        }
        for (const value of results.objetsTouristiques) {
          yield { value };
        }
      } catch (error) {
        yield { error };
        break;
      }
      from += BATCH_SIZE;
    }
  }
}
