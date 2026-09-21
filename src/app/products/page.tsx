import { redirect } from "next/navigation";

export default function ProductsDefaultPage() {
  redirect("/categories/storage");
}
