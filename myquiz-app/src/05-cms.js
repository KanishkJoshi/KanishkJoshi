// ───────────────────────────── CMS operations ─────────────────────────────
const CMS = {
  saveLocal() { LS.set('cms.pub', C.pub); LS.set('cms.drafts', C.drafts); LS.set('cms.reports', C.reports); },
  async putDraft(d) {
    const now = Date.now();
    const doc = clone({ ...d, id: d.id || rid(), by: d.by || P.uid || 'local', createdAt: d.createdAt || now, updatedAt: now });
    if (P.cdb) await P.cdb.doc(`cms/drafts/items/${doc.id}`).set(doc);
    else { const i = C.drafts.findIndex(x => x.id === doc.id); if (i >= 0) C.drafts[i] = doc; else C.drafts.push(doc); this.saveLocal(); bump(); }
    return doc;
  },
  async delDraft(id) {
    if (P.cdb) await P.cdb.doc(`cms/drafts/items/${id}`).delete();
    else { C.drafts = C.drafts.filter(x => x.id !== id); this.saveLocal(); bump(); }
  },
  async putPub(coll, item) {
    const doc = clone(item);
    if (P.cloud) { delete doc.gone; doc.ts = serverTs(); }   // the sync stamp students' phones listen for
    if (P.cdb) await P.cdb.doc(`pub/${coll}/items/${doc.id}`).set(doc);
    else { const arr = C.pub[coll]; const i = arr.findIndex(x => x.id === doc.id); if (i >= 0) arr[i] = doc; else arr.push(doc); this.saveLocal(); bump(); }
  },
  async publish(d, publishAt) {
    const coll = COLL[d.type], id = d.data.id || 'x' + d.id;
    const prev = (C.pub[coll] || []).find(x => x.id === id) || (C.base[coll] || []).find(x => x.id === id);
    if (prev && !prev.hidden) { try { await pushHistory(id, prev); } catch { /* history is best-effort */ } }
    await this.putPub(coll, { ...d.data, id: d.data.id || 'x' + d.id, publishAt, publishedAt: Date.now() });
    await this.delDraft(d.id);
  },
  async unpublish(coll, id) {
    if (P.cloud) await P.cdb.doc(`pub/${coll}/items/${id}`).set({ id, gone: true, ts: serverTs() });   // a tombstone, so phones drop it too
    else if (P.cdb) await P.cdb.doc(`pub/${coll}/items/${id}`).delete();
    else { C.pub[coll] = C.pub[coll].filter(x => x.id !== id); this.saveLocal(); bump(); }
  },
  async hide(coll, id) { await this.putPub(coll, { id, hidden: true, publishAt: todayISO(), publishedAt: Date.now() }); },
  async report(q, reason, note) {
    const r = { id: rid(), qid: q.id, qtext: String(q.q).slice(0, 240), reason, note: String(note || '').slice(0, 500), at: Date.now() };
    if (P.cdb && P.uid) {
      const ref = P.cdb.doc(`reports/${P.uid}`);
      const snap = await ref.get();
      const prev = snap.exists && Array.isArray((snap.data() || {}).items) ? clone(snap.data().items).slice(-49) : [];
      prev.push(r);
      await ref.set({ items: prev });
    } else if (LOCAL()) { C.reports.push({ ...r, uid: 'local' }); this.saveLocal(); bump(); }
    else throw { code: 'not_granted' };
  },
  async resolveReport(r) {
    if (P.cdb) {
      const ref = P.cdb.doc(`reports/${r.uid}`);
      const snap = await ref.get();
      if (!snap.exists) return;
      const items = ((snap.data() || {}).items || []).filter(x => x.id !== r.id);
      await ref.set({ items: clone(items) });
    } else { C.reports = C.reports.filter(x => x.id !== r.id); this.saveLocal(); bump(); }
  },
};
