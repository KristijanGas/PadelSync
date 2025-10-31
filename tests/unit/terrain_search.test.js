const express = require('express');
const request = require('supertest');
const path = require('path');

const terrain_search = require('../../routes/terrain_search.routes');

function createAppWithOidcStub() {
  const app = express();
  // make sure EJS views can render in tests
  app.set('views', path.join(__dirname, '../../views'));
  app.set('view engine', 'ejs');

  // stub session and oidc for routes that call req.oidc
  app.use((req, res, next) => {
    req.session = {};
    req.oidc = {
      isAuthenticated: () => false,
      user: {}
    };
    next();
  });

  app.use('/terrain_search', terrain_search);
  return app;
}

describe('GET /terrain_search', () => {
    it('returns 200 and renders terrain_search for teren', async () => {
        const app = createAppWithOidcStub();
        const res = await request(app).get('/terrain_search/results')
            .query({
                username: 'andj',
                cijena: '100',
                osvjetljenje: 'yes',
                'tipPodloge[]': 'drvo',
                'tipTeren[]': ['double', 'single']
            });
        expect(res.status).toBe(200);
        expect(res.text).toContain('Terrain ID: 6, Ime terena: teren Owner: andjela.replit');
        expect(res.text).toContain('<!DOCTYPE html>'); // basic check: HTML returned
        const res2 = await request(app).get('/terrain_search/results')
            .query({
                username: 'nonexistentuser'
            });
        expect(res2.status).toBe(200);
        expect(res2.text).toContain('No terrains found matching the criteria.');
        expect(res2.text).toContain('<!DOCTYPE html>'); // basic check: HTML returned
    });
});