const request = require('supertest');
const { app, pool } = require('../server');

describe('POST /assoc/donations/:id/accept', () => {
  const donationId = 123;

  afterEach(() => {
    if (pool && pool.query && pool.query.mockReset) {
      pool.query.mockReset();
    }
    jest.restoreAllMocks();
  });

  test('accepts donation with delivery_method=association', async () => {
    jest.spyOn(pool, 'query').mockImplementation(async (sql, params) => {
      const q = String(sql);
      if (q.includes('SELECT donation_id, donor_id, delivery_method') && q.includes('FROM donations')) {
        return { rows: [{ donation_id: donationId, donor_id: 77, delivery_method: 'association' }] };
      }
      if (q.includes('UPDATE donations') && q.includes('SET status') && q.includes('delivery_status')) {
        expect(params[0]).toBe(String(donationId));
        expect(params[1]).toBe('NEEDS_ASSIGNMENT');
        return { rowCount: 1 };
      }
      if (q.includes('INSERT INTO donation_history')) {
        return { rowCount: 1 };
      }
      if (q.includes('INSERT INTO notifications')) {
        return { rowCount: 1 };
      }
      throw new Error('Unexpected query: ' + q);
    });

    const res = await request(app)
      .post(`/assoc/donations/${donationId}/accept`)
      .send({ message: 'شكراً على تبرعك' })
      .expect(200);

    expect(res.body).toEqual({
      ok: true,
      donation_id: donationId,
      delivery_method: 'association',
      delivery_status: 'NEEDS_ASSIGNMENT',
    });
  });

  test('accepts donation with delivery_method=donor', async () => {
    jest.spyOn(pool, 'query').mockImplementation(async (sql, params) => {
      const q = String(sql);
      if (q.includes('SELECT donation_id, donor_id, delivery_method') && q.includes('FROM donations')) {
        return { rows: [{ donation_id: donationId, donor_id: 77, delivery_method: 'donor' }] };
      }
      if (q.includes('UPDATE donations') && q.includes('SET status') && q.includes('delivery_status')) {
        expect(params[1]).toBe('WAITING_FOR_DONOR');
        return { rowCount: 1 };
      }
      if (q.includes('INSERT INTO donation_history')) {
        return { rowCount: 1 };
      }
      if (q.includes('INSERT INTO notifications')) {
        return { rowCount: 1 };
      }
      throw new Error('Unexpected query: ' + q);
    });

    const res = await request(app)
      .post(`/assoc/donations/${donationId}/accept`)
      .send({})
      .expect(200);

    expect(res.body).toEqual({
      ok: true,
      donation_id: donationId,
      delivery_method: 'donor',
      delivery_status: 'WAITING_FOR_DONOR',
    });
  });

  test('returns 404 when donation not found', async () => {
    jest.spyOn(pool, 'query').mockImplementation(async (sql) => {
      const q = String(sql);
      if (q.includes('SELECT donation_id, donor_id, delivery_method') && q.includes('FROM donations')) {
        return { rows: [] };
      }
      throw new Error('Unexpected query for not-found case');
    });

    const res = await request(app)
      .post(`/assoc/donations/${donationId}/accept`)
      .send({})
      .expect(404);

    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/Donation not found/i);
  });

  test('returns 500 on database error', async () => {
    jest.spyOn(pool, 'query').mockImplementation(async (sql) => {
      const q = String(sql);
      if (q.includes('SELECT donation_id, donor_id, delivery_method') && q.includes('FROM donations')) {
        throw new Error('DB is down');
      }
      throw new Error('Should not reach other queries');
    });

    const res = await request(app)
      .post(`/assoc/donations/${donationId}/accept`)
      .send({})
      .expect(500);

    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/Failed to accept donation/i);
  });
});
