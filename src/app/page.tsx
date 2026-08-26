import { getVendors } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { VendorDashboard } from "@/components/VendorDashboard";
import { VendorChooser } from "@/components/VendorChooser";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  return user?.role === "vendor" ? <VendorDashboard /> : <VendorChooser customerName={user?.name} vendors={getVendors()} />;
}
