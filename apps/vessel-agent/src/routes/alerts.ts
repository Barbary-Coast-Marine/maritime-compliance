import { FastifyInstance } from 'fastify';

export async function alertRoutes(app: FastifyInstance) {
  /**
   * GET /api/alerts
   * List active alerts (derived from compliance evaluations)
   */
  app.get<{
    Querystring: { status?: 'active' | 'resolved' | 'all'; limit?: number };
  }>('/api/alerts', async (request, reply) => {
    const { status = 'active', limit = 50 } = request.query;

    // TODO: Query compliance_events where verdict = warning or violation
    return {
      alerts: [],
      count: 0,
    };
  });

  /**
   * POST /api/alerts/:id/acknowledge
   * Acknowledge an alert
   */
  app.post<{
    Params: { id: string };
    Body: { acknowledged_by: string };
  }>('/api/alerts/:id/acknowledge', async (request, reply) => {
    const { id } = request.params;
    const { acknowledged_by } = request.body;

    // TODO: Update compliance_events.acknowledged_at/by
    // TODO: Create audit_log entry
    return {
      success: true,
      alert_id: id,
      acknowledged_by,
      acknowledged_at: new Date().toISOString(),
    };
  });

  /**
   * POST /api/alerts/:id/resolve
   * Mark an alert as resolved (action taken)
   */
  app.post<{
    Params: { id: string };
    Body: { resolved_by: string; action_taken: string };
  }>('/api/alerts/:id/resolve', async (request, reply) => {
    const { id } = request.params;
    const { resolved_by, action_taken } = request.body;

    // TODO: Update compliance_events.resolved_at
    // TODO: Create audit_log + logbook entry
    return {
      success: true,
      alert_id: id,
      resolved_by,
      resolved_at: new Date().toISOString(),
    };
  });
}
