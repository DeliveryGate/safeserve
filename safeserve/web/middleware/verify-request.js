import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Middleware to verify that the request has a valid Shopify session.
 * Reads the shop from the Authorization header (session token) or query param.
 */
export async function verifyRequest(req, res, next) {
  const shop =
    req.query.shop ||
    req.headers["x-shopify-shop-domain"] ||
    req.body?.shop;

  if (!shop) {
    return res.status(401).json({ error: "Missing shop parameter" });
  }

  try {
    const session = await prisma.session.findFirst({
      where: { shop, isOnline: false },
      orderBy: { updatedAt: "desc" },
    });

    if (!session || !session.accessToken) {
      return res.status(401).json({ error: "No active session for this shop" });
    }

    req.shopSession = session;
    next();
  } catch (err) {
    console.error("Session verification error:", err);
    res.status(500).json({ error: "Session verification failed" });
  }
}
