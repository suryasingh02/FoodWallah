import { getCurrentUser } from "@/lib/auth";
import { orderEvents } from "@/lib/order-events";

export async function GET() {
  const user = await getCurrentUser();
  if (user?.role === "vendor") return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let cleanup: () => void = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const sendUpdate = (update: { vendorId: string; isOpen: boolean }) => {
        controller.enqueue(encoder.encode(`event: restaurant-updated\ndata: ${JSON.stringify(update)}\n\n`));
      };

      orderEvents.on("restaurant-updated", sendUpdate);
      controller.enqueue(encoder.encode(": connected\n\n"));
      cleanup = () => { orderEvents.off("restaurant-updated", sendUpdate); };
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, { headers: { "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "Content-Type": "text/event-stream" } });
}