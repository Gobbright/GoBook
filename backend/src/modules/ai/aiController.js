import { env } from '../../config/env.js';
import { AppUser } from '../../models/AppUser.js';
import { buildAiInsights } from '../retail/more-modules/insightsController.js';
import { httpError } from '../../utils/httpError.js';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_HISTORY_MESSAGES = 10;

function formatInr(amount) {
  return `₹${Number(amount ?? 0).toLocaleString('en-IN')}`;
}

function buildSystemPrompt(user, insights) {
  const { salesPrediction, lowStockCount, churnRisk, topCustomers } = insights;

  const changeText = salesPrediction.changePct != null
    ? ` (${salesPrediction.changePct >= 0 ? '+' : ''}${salesPrediction.changePct.toFixed(1)}% vs last month)`
    : '';

  const topCustomersText = topCustomers.length
    ? topCustomers.map((c) => `${c.rank}. ${c.name} — ${formatInr(c.amount)}`).join(', ')
    : 'No sales recorded yet this month';

  return [
    'You are the AI Assistant built into GoBook, a business ERP app (invoicing, GST, accounting, CRM, inventory, HR & payroll) used by Indian businesses.',
    `You are chatting with ${user?.name ?? 'a user'}${user?.businessName ? ` from ${user.businessName}` : ''}.`,
    '',
    'Live snapshot of their business:',
    `- Predicted sales this month: ${formatInr(salesPrediction.amount)}${changeText}`,
    `- Low stock items: ${lowStockCount}`,
    `- Customers at churn risk (no orders in 60+ days): ${churnRisk}`,
    `- Top customers this month: ${topCustomersText}`,
    '',
    'Use this data when relevant. For anything else, answer using general business, accounting, and GST knowledge.',
    'Keep replies short and conversational (2-4 sentences), in plain text without markdown formatting.',
  ].join('\n');
}

// POST /api/ai/chat
export async function chatWithAssistant(req, res, next) {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      throw httpError(400, 'message is required');
    }

    if (!env.groqApiKey) {
      return res.json({
        reply: "AI chat isn't set up yet. Add a free Groq API key (GROQ_API_KEY) to the backend .env file to enable this — get one at console.groq.com.",
      });
    }

    const [user, insights] = await Promise.all([
      AppUser.findById(req.user.id).select('name businessName').lean(),
      buildAiInsights(req.user.id),
    ]);

    const safeHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY_MESSAGES) : [];
    const messages = [
      { role: 'system', content: buildSystemPrompt(user, insights) },
      ...safeHistory
        .filter((m) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
        .map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message.trim() },
    ];

    const response = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.groqApiKey}`,
      },
      body: JSON.stringify({
        model: env.groqModel,
        messages,
        temperature: 0.5,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('Groq API error:', response.status, detail);
      return res.json({ reply: "Sorry, I couldn't reach the AI service right now. Please try again in a moment." });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "Sorry, I didn't get a response. Please try again.";

    res.json({ reply });
  } catch (err) {
    next(err);
  }
}
