import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <Card>
      <CardContent>
        <div className="h-48 animate-pulse rounded-md bg-slate-100" />
      </CardContent>
    </Card>
  );
}
