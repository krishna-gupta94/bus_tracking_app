-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_stops" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "stopCode" TEXT,
    "address" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "sequence" INTEGER NOT NULL,
    "eta" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "routeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "stops_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_stops" ("createdAt", "id", "latitude", "longitude", "name", "routeId", "sequence", "updatedAt") SELECT "createdAt", "id", "latitude", "longitude", "name", "routeId", "sequence", "updatedAt" FROM "stops";
DROP TABLE "stops";
ALTER TABLE "new_stops" RENAME TO "stops";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
