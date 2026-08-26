import { notFound } from "next/navigation";
import { getMenu, getVendors } from "@/lib/db";
import { MenuBrowser } from "@/components/MenuBrowser";

export const dynamic = "force-dynamic";

export default async function VendorMenuPage({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  const decodedVendorId = decodeURIComponent(vendorId);
  const vendor = getVendors().find((item) => item.id === decodedVendorId || item.id === vendorId);
  if (!vendor) notFound();

  return <MenuBrowser isRestaurantOpen={Boolean(vendor.restaurant_open)} menuItems={getMenu(vendor.id)} vendorName={vendor.shop_name || vendor.name} />;
}