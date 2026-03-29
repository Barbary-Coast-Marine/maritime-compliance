import { FastifyInstance } from 'fastify';
import { evaluateCompliance, getOverallStatus, getComplianceSummary } from '../rule-engine.js';
import type { VesselComplianceState, ComplianceRule } from '../rule-engine.js';

// TODO: Replace with real DB queries and rule loader
// This is the wiring — the rule engine does the real work

export async function complianceRoutes(app: FastifyInstance) {
  /**
   * GET /api/compliance/status
   * Returns overall compliance status + per-rule evaluations
   */
  app.get('/api/compliance/status', async (request, reply) => {
    try {
      // TODO: Load rules from YAML via rule-loader
      // TODO: Load vessel state from database
      // For now return a placeholder
      return {
        vessel_id: 'placeholder',
        status: 'pass',
        summary: { total: 0, passing: 0, warnings: 0, violations: 0, info: 0 },
        evaluations: [],
        evaluated_at: new Date().toISOString(),
      };
    } catch (err) {
      reply.status(500).send({ error: 'Failed to evaluate compliance' });
    }
  });

  /**
   * GET /api/compliance/rules
   * Returns all loaded rules for this vessel
   */
  app.get('/api/compliance/rules', async (request, reply) => {
    try {
      return {
        rules: [],
        count: 0,
      };
    } catch (err) {
      reply.status(500).send({ error: 'Failed to load rules' });
    }
  });

  /**
   * POST /api/compliance/log-completion
   * Log that a compliance item was completed (drill, inspection, etc.)
   * This updates the vessel state and re-evaluates
   */
  app.post<{
    Body: { rule_id: string; completed_by: string; notes?: string; attachments?: string[] };
  }>('/api/compliance/log-completion', async (request, reply) => {
    const { rule_id, completed_by, notes } = request.body;

    try {
      // TODO: Insert logbook entry
      // TODO: Update last_completed for the rule's metric
      // TODO: Create audit log entry
      // TODO: Re-evaluate compliance and clear any alerts

      return {
        success: true,
        rule_id,
        completed_by,
        completed_at: new Date().toISOString(),
      };
    } catch (err) {
      reply.status(500).send({ error: 'Failed to log completion' });
    }
  });

  /**
   * GET /api/compliance/upcoming
   * Returns the next N items due, sorted by urgency
   */
  app.get<{
    Querystring: { limit?: number };
  }>('/api/compliance/upcoming', async (request, reply) => {
    const limit = request.query.limit ?? 10;

    try {
      // TODO: Evaluate all rules, filter to calendar type, sort by days_remaining
      return {
        upcoming: [],
        count: 0,
      };
    } catch (err) {
      reply.status(500).send({ error: 'Failed to get upcoming items' });
    }
  });
}
