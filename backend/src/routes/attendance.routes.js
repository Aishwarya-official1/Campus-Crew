import { Router } from 'express';
import {
  markManualAttendance,
  getEventAttendanceStats,
} from '../controllers/attendance.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { manualAttendanceSchema } from '../validators/schemas.js';

const router = Router();

router.post('/events/:eventId/manual', authenticate, validate(manualAttendanceSchema), markManualAttendance);
router.get('/events/:eventId/stats', authenticate, getEventAttendanceStats);

export default router;
