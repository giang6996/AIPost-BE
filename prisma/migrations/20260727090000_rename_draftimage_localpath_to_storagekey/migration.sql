-- Rename the media reference column to a neutral name.
-- The app can now store either a local upload path or an S3 object key in this field.
ALTER TABLE "DraftImage" RENAME COLUMN "localPath" TO "storageKey";
