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

      const sendAvailabilityUpdate = (update: { id: number; isAvailable: boolean; vendorId: string | null }) => {
        controller.enqueue(encoder.encode(`event: menu-availability-updated\ndata: ${JSON.stringify(update)}\n\n`));
      };

      orderEvents.on("restaurant-updated", sendUpdate);
      orderEvents.on("menu-availability-updated", sendAvailabilityUpdate);
      controller.enqueue(encoder.encode(": connected\n\n"));
      cleanup = () => {
        orderEvents.off("restaurant-updated", sendUpdate);
        orderEvents.off("menu-availability-updated", sendAvailabilityUpdate);
      };
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, { headers: { "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "Content-Type": "text/event-stream" } });
}