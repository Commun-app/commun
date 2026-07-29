// Record Model
import { Model } from "pinia-orm";
import ModelAPI from "~/models/_factory";
import {
  entryToRecord,
  getDefinition,
  getUsersById,
  toServerValue,
} from "~/models/_commun";

const _recordModel = class Record extends Model {
  // This is the name used as module name of the Vuex Store.
  static entity = "Record";
  static primaryKey = "_id";

  // List of all fields (schema) of the post model. `this.attr` is used
  // for the generic field type. The argument is the default value.
  static fields() {
    return {
      _id: this.attr(null),
      title: this.attr(""),
      slug: this.attr(""),
      path: this.attr(""),
      status: this.attr(""),
      relatedCollection: this.attr(""),
      records: this.attr([]),
      attributes: this.attr([]),
      createdBy: this.attr({}),
      updatedBy: this.attr({}),
      publishedAt: this.attr(""),
      createdAt: this.attr(""),
      updatedAt: this.attr(""),
    };
  }

  static onRetrieve(data) {
    const { attributes = [], ...rest } = data || {};

    return {
      ...attributes.reduce(
        (acc = {}, { name, value }) => Object.assign(acc, { [name]: value }),
        {},
      ),
      ...rest,
    };
  }

  static onSave(data) {
    const { title, status, records, ...attributes } = data || {};

    return {
      title,
      status,
      records,
      attributes: Object.keys(attributes).length
        ? Object.entries(attributes).map(([name, value]) => ({ name, value }))
        : undefined,
    };
  }
};

// Le serveur borne entries.list à 100 par page — les appels legacy montaient
// à 500 (select-record) : on pagine pour honorer la limite demandée.
const PAGE_MAX = 100;

const _recordAPI = class RecordAPI extends ModelAPI {
  /**
   * record aplati → payload entries.* : seuls les champs DÉFINIS par la
   * collection alimentent `data` (les colonnes document _id/slug/path/…
   * renvoyées par onSave sont ignorées, iso legacy). `records[]` (liens
   * libres de l'onglet Relations) part en `related` — le serveur entretient
   * la symétrie des liens inverses (upgrade-admin-nuxt4).
   */
  async _payload(record, collection) {
    const definition = await getDefinition(this.trpc, collection);
    const fieldsByName = new Map(
      definition.fields.map((field) => [field.name, field]),
    );
    const { title, status, records, attributes = [] } = this.onSave(record);

    const data = {};
    for (const { name, value } of attributes ?? []) {
      const field = fieldsByName.get(name);
      if (!field) continue;
      data[name] = toServerValue(field, value);
    }

    const payload = {};
    if (title !== undefined) payload.title = title;
    if (status) payload.status = status;
    if (Object.keys(data).length) payload.data = data;
    if (Array.isArray(records)) payload.related = records;
    return { definition, payload };
  }

  async read(_id, collection) {
    const definition = await getDefinition(this.trpc, collection);
    const [entry, usersById] = await Promise.all([
      this.trpc.collections.entries.get.query({ id: _id }),
      getUsersById(this.trpc),
    ]);
    this.repo.save(entryToRecord(definition, entry, usersById));
    return this.repo.find(_id);
  }

  async list(collection, organizationId, queryParams = {}) {
    // Une collection absente ne casse pas la page (iso legacy : liste vide).
    const definition = await getDefinition(this.trpc, collection).catch(
      () => null,
    );
    if (!definition) return this.repo.query().all();

    const skip = Number(queryParams.skip ?? 0);
    const wanted = Number(queryParams.limit ?? 20);
    const entries = [];
    while (entries.length < wanted) {
      const size = Math.min(wanted - entries.length, PAGE_MAX);
      const page = await this.trpc.collections.entries.list.query({
        collectionId: definition.id,
        skip: skip + entries.length,
        limit: size,
      });
      entries.push(...page);
      if (page.length < size) break;
    }

    const usersById = await getUsersById(this.trpc);
    const records = entries.map((entry) => entryToRecord(definition, entry, usersById));
    if (queryParams?.skip !== 0) {
      this.repo.save(records);
    } else {
      this.repo.fresh(records);
    }
    return this.repo.query().all();
  }

  async create(record, collection) {
    const { definition, payload } = await this._payload(record, collection);
    const entry = await this.trpc.collections.entries.create.mutate({
      collectionId: definition.id,
      // `data` est requis à la création (le slug est généré serveur, iso legacy).
      data: { status: "draft", ...payload, data: payload.data ?? {} },
    });
    const saved = entryToRecord(definition, entry, await getUsersById(this.trpc));
    this.repo.save(saved);
    return this.repo.find(saved._id);
  }

  async update(_id, record, collection) {
    const { definition, payload } = await this._payload(record, collection);
    const entry = await this.trpc.collections.entries.update.mutate({
      id: _id,
      data: payload,
    });
    this.repo.save(entryToRecord(definition, entry, await getUsersById(this.trpc)));
    return this.repo.find(_id);
  }

  async remove(_id) {
    await this.trpc.collections.entries.remove.mutate({ id: _id });
    return this.repo.destroy(_id);
  }
};

export default { model: _recordModel, api: _recordAPI };
