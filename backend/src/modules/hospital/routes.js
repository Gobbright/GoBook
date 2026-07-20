import { Router } from 'express';

export const hospitalRouter = Router();

// Hospital-specific business logic (patients, appointments, OPD/IPD, pharmacy,
// lab, radiology, billing, insurance) is not implemented yet — this stub only
// proves the module is physically separate and reachable for Hospital-category
// businesses. Real endpoints land here as each area is built out.
hospitalRouter.get('/', (_req, res) => {
  res.json({ message: 'Hospital module coming soon' });
});
