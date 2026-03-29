import { FastifyInstance } from 'fastify';

export async function logbookRoutes(app: FastifyInstance) {
  /**
   * GET /api/logbook
   * List logbook entries with optional filters
   */
  app.get<{
    Querystring: { type?: string; limit?: number; offset?: number };
  }>('/api/logbook', async (request, reply) => {
    const { type, limit = 50, offset = 0 } = request.query;

    // TODO: Query logbook_entries table with filters
    return {
      entries: [],
      total: 0,
      limit,
      offset,
    };
  });

  /**
   * POST /api/logbook
   * Create a new logbook entry
   */
  app.post<{
    Body: {
      entry_type: 'drill' | 'inspection' | 'fuel_dip' | 'maintenance' | 'general';
      title: string;
      body: string;
      author: string;
      attachments?: { filename: string; mime_type: string; path: string }[];
      // Type-specific fields
      drill_type?: string;
      crew_present?: number;
      crew_total?: number;
      equipment_tested?: string[];
      fuel_port_percent?: number;
      fuel_starboard_percent?: number;
      fuel_total_gallons?: number;
      system_name?: string;
      next_due_date?: string;
    };
  }>('/api/logbook', async (request, reply) => {
    const entry = request.body;

    try {
      // TODO: Insert into logbook_entries table
      // TODO: Create audit_log entry
      // TODO: If this completes a compliance rule, update last_completed metric

      return {
        success: true,
        entry_id: 'placeholder',
        created_at: new Date().toISOString(),
      };
    } catch (err) {
      reply.status(500).send({ error: 'Failed to create logbook entry' });
    }
  });

  /**
   * GET /api/logbook/:id
   * Get a single logbook entry
   */
  app.get<{
    Params: { id: string };
  }>('/api/logbook/:id', async (request, reply) => {
    const { id } = request.params;
    // TODO: Query by ID
    return { entry: null };
  });
}
