// Portage iso-legacy du moteur de mapping déclaratif du job-data-sync
// (`_mapper.js`). Les mappings stockés dans `legacyExtra.injector` doivent
// produire EXACTEMENT le même résultat qu'en production — les sémantiques
// discutables mais inoffensives sont donc conservées telles quelles (valeurs
// falsy omises, `replace` de la première occurrence seule, comparateurs
// stricts). Décision D4 du design port-legacy-jobs.

export type MappingField = { source?: string; transform?: unknown };
export type MappingDictionary = Record<string, MappingField>;

/** Handlers des transforms `@…` (schedules, media, wysiwyg) injectés par l'appelant. */
export type TransformHandlers = Record<string, (value: unknown) => unknown>;

// biome-ignore lint/suspicious/noExplicitAny: portage iso du mapper legacy non typé
type LooseDoc = Record<string, any>;

export class ObjectMapper {
  constructor(
    private readonly dictionary: MappingDictionary | undefined,
    private readonly handlers: TransformHandlers = {},
  ) {}

  private append(obj: LooseDoc, path: string, value: unknown): void {
    const keys = path.split('.');
    const lastKey = keys.pop() as string;

    let nestedObj = obj;
    for (const key of keys) {
      nestedObj[key] = nestedObj[key] || {};
      nestedObj = nestedObj[key];
    }

    // Iso legacy : seule la PREMIÈRE occurrence de \n est échappée.
    nestedObj[lastKey] = typeof value === 'string' ? value.replace('\n', '\\n') : value;
  }

  mapObject(input: unknown): LooseDoc {
    const output: LooseDoc = {};

    if (this.dictionary) {
      for (const fieldName in this.dictionary) {
        const field = this.dictionary[fieldName];
        if (!field) continue;
        const source = field.source;
        const transform = field.transform;

        let value: unknown;
        if (source) {
          value = this.getValueFromSource(input, source);
        }
        if (transform) {
          value = this.applyTransform(input, transform, source);
        }

        // Iso legacy : les valeurs falsy (false, 0, '') sont omises.
        if (value) {
          this.append(output, fieldName, value);
        }
      }
    }

    return output;
  }

  getValueFromSource(
    obj: unknown,
    source: string | undefined,
    settings: { filters?: LooseDoc[]; mappers?: LooseDoc[] } = {},
    // biome-ignore lint/suspicious/noExplicitAny: résolution de chemins dynamiques iso legacy
  ): any {
    if (!source || source === '.') {
      return obj;
    }
    const keys = source.split('.');
    // biome-ignore lint/suspicious/noExplicitAny: accumulateur de chemin dynamique iso legacy
    return keys.reduce((acc: any, key) => {
      // Itérateur nommé `$[nom]` — résolu par un filter ($arrayFilters) ou un mapper ($mapping).
      if (Array.isArray(acc) && key.startsWith('$[') && key.endsWith(']')) {
        const { filters = [], mappers = [] } = settings;
        const iteratorName = `$${key.substring(2, key.length - 1)}`;

        if (filters.length) {
          const arrayFilter = filters.find((filter) =>
            Object.keys(filter).find((filterKey) => filterKey.startsWith(iteratorName)),
          );
          const matchingKey =
            arrayFilter &&
            Object.keys(arrayFilter).find((filterKey) => filterKey.startsWith(iteratorName));
          if (arrayFilter && matchingKey) {
            const modifiedArrayFilter = {
              [matchingKey.replace(`${iteratorName}.`, '')]: arrayFilter[matchingKey],
            };
            const filteredData = acc.filter((element) =>
              this.evaluate(modifiedArrayFilter, element),
            );
            return filteredData?.length ? filteredData : undefined;
          }
        }

        if (mappers.length) {
          const arrayMapper = mappers.find((mapper) =>
            Object.keys(mapper).find((mapperKey) => mapperKey.startsWith(iteratorName)),
          );
          if (arrayMapper) {
            const matchingKeys = Object.keys(arrayMapper).map((mappingKey) =>
              mappingKey.replace(`${iteratorName}.`, ''),
            );
            return acc.map((element) => {
              const projected: LooseDoc = {};
              for (const matchingKey of matchingKeys) {
                projected[matchingKey] = element[matchingKey];
              }
              return projected;
            });
          }
        }
      }

      // Index de tableau `[n]`.
      if (Array.isArray(acc) && key.startsWith('[') && key.endsWith(']')) {
        const arrayIndex = parseInt(key.substring(1, key.length - 1), 10);
        return acc[arrayIndex];
      }

      // Iso legacy : `acc?.[key] ? … : undefined` — les valeurs falsy sont perdues.
      return acc?.[key] ? acc[key] : undefined;
    }, obj);
  }

  applyTransform(input: unknown, transform: unknown, source: string | undefined): unknown {
    // Transform « simple » : `_source` renvoie l'objet entier, sinon la valeur littérale.
    if (typeof transform !== 'object' || transform === null) {
      return transform === '_source' ? input : transform;
    }

    const [transformation] = Object.keys(transform as LooseDoc);
    const spec = transform as LooseDoc;

    // Transforms `@…` (schedules, media, wysiwyg…) — fournis par l'appelant.
    if (transformation?.startsWith('@')) {
      const handler = this.handlers[transformation];
      if (!handler) {
        throw new Error('E_UNKNOWN_TRANSFORMATION');
      }
      return handler(this.getValueFromSource(input, source));
    }

    switch (transformation) {
      case '$concat': {
        const concatFields: Array<{ source?: string }> = spec.$concat;
        return concatFields
          .map(({ source: concatField }) => this.getValueFromSource(input, concatField))
          .filter((value) => typeof value === 'string')
          .join(', ');
      }

      case '$relation': {
        const { sort, ref, refs = [], identifier } = spec.$relation;
        switch (sort) {
          case 'relation-one-to-one':
          case 'relation-one-to-many':
            return this.getValueFromSource(input, ref.source)?.map(
              (refId: unknown) => `${ref.collection}:${identifier}:${refId}`,
            );
          case 'relation-many-to-many': {
            const tmpArr: string[] = [];
            for (const collectionRef of refs as Array<{ collection: string; source: string }>) {
              const references = this.getValueFromSource(input, collectionRef.source)?.map(
                (refId: unknown) => `${collectionRef.collection}:${identifier}:${refId}`,
              );
              if (references?.length) {
                tmpArr.push(...references);
              }
            }
            return [...tmpArr];
          }
          default:
            throw new Error('E_UNKNOWN_RELATION_SORT');
        }
      }

      case '$arrayFilters':
        return this.getValueFromSource(input, source, { filters: spec.$arrayFilters });

      case '$condition': {
        const operator = Object.keys(spec.$condition).find((key) => ['$and', '$or'].includes(key));
        switch (operator) {
          case '$and':
          case '$or':
            return this.evaluate(spec.$condition, input)
              ? this.applyTransform(input, spec.$condition.$then, source)
              : this.applyTransform(input, spec.$condition.$else, source);
          default:
            throw new Error('E_UNKNOWN_CONDITION');
        }
      }

      case '$mapping':
        return this.getValueFromSource(input, source, { mappers: spec.$mapping });

      default:
        throw new Error('E_UNKNOWN_TRANSFORMATION');
    }
  }

  evaluate(instruction: LooseDoc, input: unknown): boolean {
    const operator = Object.keys(instruction).find((key) => ['$and', '$or'].includes(key));
    switch (operator) {
      case '$and':
        for (const condition of instruction[operator]) {
          if (!this.evaluate(condition, input)) {
            return false;
          }
        }
        return true;

      case '$or':
        for (const condition of instruction[operator]) {
          if (this.evaluate(condition, input)) {
            return true;
          }
        }
        return false;

      default: {
        if (typeof instruction === 'object' && instruction !== null) {
          const [source] = Object.keys(instruction);
          const condition = source ? instruction[source] : undefined;
          if (source && condition) {
            const [comparison] = Object.keys(condition);
            // Iso legacy : comparaisons STRICTES (=== / !==), aucune coercition.
            switch (comparison) {
              case '$eq':
                return this.getValueFromSource(input, source) === condition.$eq;
              case '$ne':
                return this.getValueFromSource(input, source) !== condition.$ne;
              case '$gt':
                return this.getValueFromSource(input, source) > condition.$gt;
              case '$gte':
                return this.getValueFromSource(input, source) >= condition.$gte;
              case '$lt':
                return this.getValueFromSource(input, source) < condition.$lt;
              case '$lte':
                return this.getValueFromSource(input, source) <= condition.$lte;
              case '$in':
                return condition.$in.includes(this.getValueFromSource(input, source));
              case '$nin':
                return !condition.$nin.includes(this.getValueFromSource(input, source));
              default:
                throw new Error('E_UNKNOWN_OPERATOR');
            }
          }
        }
        throw new Error('E_UNKNOWN_OPERATOR');
      }
    }
  }
}
