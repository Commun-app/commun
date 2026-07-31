import { defineTask } from 'nitro/task';
import { consola } from 'consola';
import { useCore } from '../../utils/core.ts';

/**
 * Balaie tous les enregistrements et retire les instantanés de média figés
 * (`attrs.data`) posés par l'éditeur legacy dans le rich-text.
 *
 * TÂCHE TEMPORAIRE, à retirer avec le décommissionnement du legacy. Elle
 * n'existe que parce que deux sources réintroduisent ces instantanés pendant
 * la migration : l'admin legacy, tant que les clients y écrivent encore, et
 * surtout le pipeline de resynchronisation, qui réinstalle la base migrée à
 * chaque passe. Un nettoyage ponctuel serait donc défait dès le lendemain ;
 * une passe quotidienne tient jusqu'à la bascule.
 *
 * Sans effet une fois la source tarie — c'est ce qui la rend sûre à laisser
 * tourner, et facile à supprimer le jour venu.
 */
export default defineTask({
  meta: {
    name: 'sanitize:media',
    description: 'Retire les instantanés de média figés du rich-text (héritage legacy)',
  },
  async run(): Promise<{ result: { entries: number; nodes: number } }> {
    const { services } = useCore();
    const result = await services.collections.sanitizeLegacyMediaSnapshots();
    if (result.nodes > 0) {
      consola.info(
        `[sanitize:media] ${result.nodes} instantané(s) retiré(s) dans ${result.entries} entrée(s)`,
      );
    }
    return { result };
  },
});
