-- P0 rules Prisma can't express. R numbers match prisma/schema.prisma.

-- ───────── Official sources (R1) ─────────

-- Host of an http(s) URL, lowercased, without port.
CREATE FUNCTION aph_url_host(url text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(substring(url from '^[A-Za-z][A-Za-z0-9+.-]*://(?:[^@/]*@)?([^/:?#]+)'))
$$;

-- True when the URL's host is on the OfficialDomain allowlist, exactly or as a subdomain.
CREATE FUNCTION aph_is_official(url text) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM "OfficialDomain" d, (SELECT aph_url_host(url) AS h) x
    WHERE x.h = d.domain OR right(x.h, length(d.domain) + 1) = '.' || d.domain
  )
$$;

-- Source."isOfficial" always comes from the allowlist, never from the writer.
CREATE FUNCTION aph_source_official() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."isOfficial" := aph_is_official(NEW.url);
  RETURN NEW;
END $$;
CREATE TRIGGER aph_source_official BEFORE INSERT OR UPDATE ON "Source"
  FOR EACH ROW EXECUTE FUNCTION aph_source_official();

-- A change to the allowlist re-checks every source.
CREATE FUNCTION aph_domains_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "Source" SET "isOfficial" = aph_is_official(url) WHERE "isOfficial" IS DISTINCT FROM aph_is_official(url);
  RETURN NULL;
END $$;
CREATE TRIGGER aph_domains_changed AFTER INSERT OR UPDATE OR DELETE ON "OfficialDomain"
  FOR EACH STATEMENT EXECUTE FUNCTION aph_domains_changed();

-- R1: publishing needs at least one citation to an official source. Checked at
-- commit, so a version and its citations can be written in one transaction.
CREATE FUNCTION aph_r1_publish_check() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ok boolean;
BEGIN
  IF NEW.status = 'PUBLISHED' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM "Citation" c JOIN "Source" s ON s.id = c."sourceId" WHERE c.%I = $1 AND s."isOfficial")',
      TG_ARGV[0]) INTO ok USING NEW.id;
    IF NOT ok THEN
      RAISE EXCEPTION 'R1: % % has no citation to an official source, so it cannot be published', TG_TABLE_NAME, NEW.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NULL;
END $$;

-- ───────── Published versions are never edited (R3) ─────────

CREATE FUNCTION aph_r3_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE keep text[] := ARRAY['status', 'supersededAt', 'effectiveTo'];
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('PUBLISHED', 'SUPERSEDED') THEN
      RAISE EXCEPTION 'R3: % % was published and cannot be deleted', TG_TABLE_NAME, OLD.id USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'PUBLISHED' THEN
    -- The one allowed change: superseding it, with its end dates.
    IF NEW.status = 'SUPERSEDED' AND (to_jsonb(NEW) - keep) = (to_jsonb(OLD) - keep) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'R3: % % is published; write a new version instead', TG_TABLE_NAME, OLD.id USING ERRCODE = 'check_violation';
  ELSIF OLD.status IN ('SUPERSEDED', 'REJECTED') THEN
    RAISE EXCEPTION 'R3: % % is closed', TG_TABLE_NAME, OLD.id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

-- Citations of a published or superseded version are frozen with it, except
-- quoteCheckedAt, which the monthly source check updates.
CREATE FUNCTION aph_citation_frozen() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r "Citation"; st text;
BEGIN
  r := CASE WHEN TG_OP = 'INSERT' THEN NEW ELSE OLD END;
  SELECT COALESCE(
    (SELECT status::text FROM "StateProfileVersion" WHERE id = r."stateProfileVersionId"),
    (SELECT status::text FROM "AgencyVersion" WHERE id = r."agencyVersionId"),
    (SELECT status::text FROM "PermitProgramVersion" WHERE id = r."programVersionId"),
    (SELECT status::text FROM "RegulationVersion" WHERE id = r."regulationVersionId"),
    (SELECT status::text FROM "GlossaryTermVersion" WHERE id = r."glossaryVersionId")
  ) INTO st;
  IF st IN ('PUBLISHED', 'SUPERSEDED') THEN
    IF TG_OP = 'UPDATE' AND (to_jsonb(NEW) - 'quoteCheckedAt') = (to_jsonb(OLD) - 'quoteCheckedAt') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'R3: citation % belongs to a % version and cannot change', r.id, lower(st) USING ERRCODE = 'check_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER aph_citation_frozen BEFORE INSERT OR UPDATE OR DELETE ON "Citation"
  FOR EACH ROW EXECUTE FUNCTION aph_citation_frozen();

-- Each citation supports exactly one version.
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_one_version" CHECK (
  num_nonnulls("stateProfileVersionId", "agencyVersionId", "programVersionId", "regulationVersionId", "glossaryVersionId") = 1
);

-- ───────── Audit log is append-only (R9) ─────────

CREATE FUNCTION aph_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'check_violation';
END $$;
CREATE TRIGGER aph_audit_append_only BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION aph_append_only();

-- ───────── Per version table: one published, R1, R3, R4 ─────────

-- StateProfileVersion
CREATE UNIQUE INDEX "StateProfileVersion_one_published" ON "StateProfileVersion" ("stateId") WHERE status = 'PUBLISHED';
ALTER TABLE "StateProfileVersion" ADD CONSTRAINT "StateProfileVersion_reviewer_not_author" CHECK ("reviewedById" IS NULL OR "reviewedById" <> "authorId");
CREATE CONSTRAINT TRIGGER aph_r1 AFTER INSERT OR UPDATE OF status ON "StateProfileVersion"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aph_r1_publish_check('stateProfileVersionId');
CREATE TRIGGER aph_r3 BEFORE UPDATE OR DELETE ON "StateProfileVersion"
  FOR EACH ROW EXECUTE FUNCTION aph_r3_immutable();

-- AgencyVersion
CREATE UNIQUE INDEX "AgencyVersion_one_published" ON "AgencyVersion" ("agencyId") WHERE status = 'PUBLISHED';
ALTER TABLE "AgencyVersion" ADD CONSTRAINT "AgencyVersion_reviewer_not_author" CHECK ("reviewedById" IS NULL OR "reviewedById" <> "authorId");
CREATE CONSTRAINT TRIGGER aph_r1 AFTER INSERT OR UPDATE OF status ON "AgencyVersion"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aph_r1_publish_check('agencyVersionId');
CREATE TRIGGER aph_r3 BEFORE UPDATE OR DELETE ON "AgencyVersion"
  FOR EACH ROW EXECUTE FUNCTION aph_r3_immutable();

-- PermitProgramVersion
CREATE UNIQUE INDEX "PermitProgramVersion_one_published" ON "PermitProgramVersion" ("programId") WHERE status = 'PUBLISHED';
ALTER TABLE "PermitProgramVersion" ADD CONSTRAINT "PermitProgramVersion_reviewer_not_author" CHECK ("reviewedById" IS NULL OR "reviewedById" <> "authorId");
CREATE CONSTRAINT TRIGGER aph_r1 AFTER INSERT OR UPDATE OF status ON "PermitProgramVersion"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aph_r1_publish_check('programVersionId');
CREATE TRIGGER aph_r3 BEFORE UPDATE OR DELETE ON "PermitProgramVersion"
  FOR EACH ROW EXECUTE FUNCTION aph_r3_immutable();

-- RegulationVersion
CREATE UNIQUE INDEX "RegulationVersion_one_published" ON "RegulationVersion" ("regulationId") WHERE status = 'PUBLISHED';
ALTER TABLE "RegulationVersion" ADD CONSTRAINT "RegulationVersion_reviewer_not_author" CHECK ("reviewedById" IS NULL OR "reviewedById" <> "authorId");
CREATE CONSTRAINT TRIGGER aph_r1 AFTER INSERT OR UPDATE OF status ON "RegulationVersion"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aph_r1_publish_check('regulationVersionId');
CREATE TRIGGER aph_r3 BEFORE UPDATE OR DELETE ON "RegulationVersion"
  FOR EACH ROW EXECUTE FUNCTION aph_r3_immutable();

-- GlossaryTermVersion
CREATE UNIQUE INDEX "GlossaryTermVersion_one_published" ON "GlossaryTermVersion" ("termId") WHERE status = 'PUBLISHED';
ALTER TABLE "GlossaryTermVersion" ADD CONSTRAINT "GlossaryTermVersion_reviewer_not_author" CHECK ("reviewedById" IS NULL OR "reviewedById" <> "authorId");
CREATE CONSTRAINT TRIGGER aph_r1 AFTER INSERT OR UPDATE OF status ON "GlossaryTermVersion"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aph_r1_publish_check('glossaryVersionId');
CREATE TRIGGER aph_r3 BEFORE UPDATE OR DELETE ON "GlossaryTermVersion"
  FOR EACH ROW EXECUTE FUNCTION aph_r3_immutable();
