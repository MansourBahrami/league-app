"use client";

import { useEffect, useRef } from "react";
import { captureProductEvent, type ProductEvent } from "@/lib/analytics-client";

export default function ProductViewEvent({
  event,
  properties,
}: {
  event: ProductEvent;
  properties?: Record<string, string | number | boolean | null>;
}) {
  const captured = useRef(false);
  useEffect(() => {
    if (captured.current) return;
    captured.current = true;
    captureProductEvent(event, properties);
  }, [event, properties]);
  return null;
}
