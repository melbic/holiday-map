import bookingStrategy from "./booking.ts";
import finnStrategy from "./finn.ts";
import googleMapsStrategy from "./google-maps.ts";
import inaturStrategy from "./inatur.ts";

import type { ImportStrategy } from "../types.ts";

const strategies: ImportStrategy[] = [bookingStrategy, finnStrategy, googleMapsStrategy, inaturStrategy].sort(
  (left, right) => left.priority - right.priority || left.id.localeCompare(right.id),
);

export async function loadStrategies(): Promise<ImportStrategy[]> {
  return strategies;
}
