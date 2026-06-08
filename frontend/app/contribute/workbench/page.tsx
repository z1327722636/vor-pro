import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

export default function WorkbenchPage({ searchParams }: { searchParams: SearchParams }) {
  const query = new URLSearchParams({ tab: "video" });

  Object.entries(searchParams).forEach(([key, value]) => {
    if (key === "tab" || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
      return;
    }
    query.set(key, value);
  });

  redirect(`/contribute/upload?${query.toString()}`);
}
