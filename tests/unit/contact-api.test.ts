import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '../../pages/api/contact';

function mockRes() {
    const res = {
        statusCode: 0,
        body: undefined as unknown,
        headers: {} as Record<string, string>,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: unknown) {
            this.body = payload;
            return this;
        },
        setHeader(key: string, value: string) {
            this.headers[key] = value;
        },
    };
    return res as typeof res & NextApiResponse;
}

const req = (method: string, body?: unknown) =>
    ({ method, body } as NextApiRequest);

const validBody = {
    name: 'Jane Recruiter',
    email: 'jane@example.com',
    message: 'We would like to interview you.',
};

describe('/api/contact', () => {
    beforeEach(() => {
        delete process.env.RESEND_API_KEY;
    });
    afterEach(() => {
        vi.restoreAllMocks();
        delete process.env.RESEND_API_KEY;
    });

    it('rejects non-POST methods with 405', async () => {
        const res = mockRes();
        await handler(req('GET'), res);
        expect(res.statusCode).toBe(405);
        expect(res.headers.Allow).toBe('POST');
    });

    it.each([
        ['missing body', undefined],
        ['empty name', { ...validBody, name: '  ' }],
        ['invalid email', { ...validBody, email: 'not-an-email' }],
        ['empty message', { ...validBody, message: '' }],
        ['non-string fields', { name: 1, email: 2, message: 3 }],
    ])('rejects %s with 400', async (_label, body) => {
        const res = mockRes();
        await handler(req('POST', body), res);
        expect(res.statusCode).toBe(400);
    });

    it('rejects oversized messages with 400', async () => {
        const res = mockRes();
        await handler(
            req('POST', { ...validBody, message: 'x'.repeat(5001) }),
            res
        );
        expect(res.statusCode).toBe(400);
    });

    it('returns 503 when the mail relay is not configured', async () => {
        const res = mockRes();
        await handler(req('POST', validBody), res);
        expect(res.statusCode).toBe(503);
    });

    it('relays valid submissions and returns 200', async () => {
        process.env.RESEND_API_KEY = 'test-key';
        const fetchMock = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(new Response('{}', { status: 200 }));

        const res = mockRes();
        await handler(req('POST', validBody), res);

        expect(res.statusCode).toBe(200);
        expect(fetchMock).toHaveBeenCalledOnce();
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://api.resend.com/emails');
        const sent = JSON.parse(String(init?.body));
        expect(sent.reply_to).toBe(validBody.email);
        expect(sent.text).toContain(validBody.message);
    });

    it('returns 502 when the mail relay fails', async () => {
        process.env.RESEND_API_KEY = 'test-key';
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('nope', { status: 401 })
        );
        vi.spyOn(console, 'error').mockImplementation(() => {});

        const res = mockRes();
        await handler(req('POST', validBody), res);
        expect(res.statusCode).toBe(502);
    });
});
