// Relays contact-form submissions to my inbox via Resend.
// Requires the RESEND_API_KEY environment variable (free tier: resend.com).

import type { NextApiRequest, NextApiResponse } from 'next';

const TO_ADDRESS = 'tcisneros.cis@gmail.com';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'This endpoint only accepts POST requests' });
    }

    const { name, email, message } = req.body || {};
    if (
        typeof name !== 'string' ||
        typeof email !== 'string' ||
        typeof message !== 'string' ||
        !name.trim() ||
        !message.trim() ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        return res.status(400).json({ error: 'Please fill in all required fields' });
    }
    if (name.length > 200 || email.length > 200 || message.length > 5000) {
        return res.status(400).json({ error: 'Message too long (max 5000 characters)' });
    }

    if (!process.env.RESEND_API_KEY) {
        return res.status(503).json({ error: 'Server configuration error' });
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'Portfolio Contact <onboarding@resend.dev>',
            to: [TO_ADDRESS],
            reply_to: email,
            subject: `Portfolio contact from ${name.trim()}`,
            text: `Name: ${name.trim()}\nEmail: ${email.trim()}\n\n${message.trim()}`,
        }),
    });

    if (!response.ok) {
        const detail = await response.text();
        console.error('Resend error:', response.status, detail);
        return res.status(502).json({ error: 'Failed to send. Try again or email me directly' });
    }

    return res.status(200).json({ ok: true });
}
