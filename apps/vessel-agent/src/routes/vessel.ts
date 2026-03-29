import { FastifyInstance } from 'fastify';

export async function vesselRoutes(app: FastifyInstance) {
  /**
   * GET /api/vessel
   * Get vessel profile
   */
  app.get('/api/vessel', async (request, reply) => {
    // TODO: Query vessels table (single vessel per installation)
    return { vessel: null };
  });

  /**
   * PUT /api/vessel
   * Update vessel profile
   */
  app.put<{
    Body: {
      vessel_name?: string;
      imo_number?: string;
      vessel_type?: string;
      flag_state?: string;
      gross_tonnage?: number;
      year_built?: number;
      coi_date?: string;
      coi_expiry?: string;
      last_drydock?: string;
    };
  }>('/api/vessel', async (request, reply) => {
    // TODO: Update vessels table
    // TODO: Audit log
    return { success: true, updated_at: new Date().toISOString() };
  });

  /**
   * GET /api/vessel/documents
   * List documents in the vault
   */
  app.get<{
    Querystring: { doc_type?: string };
  }>('/api/vessel/documents', async (request, reply) => {
    // TODO: Query document_vault
    return { documents: [], count: 0 };
  });

  /**
   * POST /api/vessel/documents
   * Upload a document
   */
  app.post('/api/vessel/documents', async (request, reply) => {
    // TODO: Handle multipart file upload
    // TODO: Store in local filesystem + record in document_vault table
    return { success: true, document_id: 'placeholder' };
  });
}
