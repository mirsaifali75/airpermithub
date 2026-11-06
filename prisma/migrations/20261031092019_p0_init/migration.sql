-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'EDITOR', 'REVIEWER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('INDIVIDUAL', 'CONSULTANT', 'COMPANY');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PROFESSIONAL', 'TEAM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "Jurisdiction" AS ENUM ('FEDERAL', 'STATE', 'LOCAL', 'TRIBAL');

-- CreateEnum
CREATE TYPE "VersionStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'SUPERSEDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('OFFICIAL_SOURCE', 'APH_SUMMARY', 'NEEDS_REVIEW', 'RECENTLY_UPDATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Verification" AS ENUM ('VERIFIED', 'PARTIAL', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('RULE_TEXT', 'FEDERAL_REGISTER', 'GUIDANCE', 'FORM', 'DATA', 'AGENCY_PAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "CitationRole" AS ENUM ('PRIMARY', 'QUOTE', 'THRESHOLDS', 'FORM', 'GUIDANCE', 'REGULATION', 'SOURCE', 'PORTAL', 'FEES', 'LOCAL_AGENCY');

-- CreateEnum
CREATE TYPE "ContentEntity" AS ENUM ('STATE_PROFILE', 'AGENCY', 'PERMIT_PROGRAM', 'REGULATION', 'GLOSSARY_TERM', 'SOURCE', 'OFFICIAL_DOMAIN');

-- CreateEnum
CREATE TYPE "ReviewKind" AS ENUM ('NEW_RECORD', 'CHANGE', 'SOURCE_CHANGED', 'ERROR_REPORT', 'FEDERAL_REGISTER_MATCH', 'RESTATED_THRESHOLD', 'OFFICIAL_DOMAIN');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'APPROVED', 'SENT_BACK', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PermitType" AS ENUM ('EXEMPTION', 'REGISTRATION', 'PBR', 'GENERAL', 'STANDARD', 'MINOR_NSR', 'PSD', 'NNSR', 'TITLE_V', 'STATE_OPERATING', 'OTHER');

-- CreateEnum
CREATE TYPE "ErrorReportStatus" AS ENUM ('NEW', 'TRIAGED', 'FIXED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER',
    "accountType" "AccountType" NOT NULL DEFAULT 'INDIVIDUAL',
    "plan" "PlanTier" NOT NULL DEFAULT 'FREE',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" "SourceKind" NOT NULL,
    "publisher" TEXT NOT NULL,
    "agencyId" TEXT,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficialDomain" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "jurisdiction" "Jurisdiction" NOT NULL,
    "note" TEXT,
    "addedById" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficialDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceSnapshot" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "httpStatus" INTEGER NOT NULL,
    "contentHash" TEXT,
    "changedSincePrevious" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SourceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citation" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "role" "CitationRole" NOT NULL,
    "label" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "pinpoint" TEXT,
    "verbatimQuote" TEXT,
    "quoteCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stateProfileVersionId" TEXT,
    "agencyVersionId" TEXT,
    "programVersionId" TEXT,
    "regulationVersionId" TEXT,
    "glossaryVersionId" TEXT,

    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL,
    "code" CHAR(2) NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "epaRegion" INTEGER NOT NULL,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateProfileVersion" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "overview" TEXT NOT NULL,
    "notes" TEXT,
    "oilAndGasSummary" TEXT,
    "lastReviewed" DATE NOT NULL,
    "localAgencies" JSONB,
    "regulations" JSONB NOT NULL,
    "forms" JSONB NOT NULL,
    "guidance" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "ePermitting" JSONB,
    "fees" JSONB,
    "versionNo" INTEGER NOT NULL,
    "status" "VersionStatus" NOT NULL DEFAULT 'DRAFT',
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "verification" "Verification" NOT NULL DEFAULT 'UNVERIFIED',
    "effectiveFrom" DATE,
    "effectiveTo" DATE,
    "publishedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "revisionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StateProfileVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulatoryAgency" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "jurisdiction" "Jurisdiction" NOT NULL,
    "stateId" TEXT,

    CONSTRAINT "RegulatoryAgency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyVersion" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "division" TEXT,
    "url" TEXT NOT NULL,
    "permitsUrl" TEXT,
    "versionNo" INTEGER NOT NULL,
    "status" "VersionStatus" NOT NULL DEFAULT 'DRAFT',
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "verification" "Verification" NOT NULL DEFAULT 'UNVERIFIED',
    "effectiveFrom" DATE,
    "effectiveTo" DATE,
    "publishedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "revisionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermitProgram" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "stateId" TEXT,
    "agencyId" TEXT NOT NULL,
    "type" "PermitType" NOT NULL,
    "isOilAndGas" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,

    CONSTRAINT "PermitProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermitProgramVersion" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "citationText" TEXT,
    "url" TEXT,
    "verbatimQuote" TEXT,
    "quoteSource" JSONB,
    "restatedThreshold" TEXT,
    "thresholdsSource" JSONB,
    "versionNo" INTEGER NOT NULL,
    "status" "VersionStatus" NOT NULL DEFAULT 'DRAFT',
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "verification" "Verification" NOT NULL DEFAULT 'UNVERIFIED',
    "effectiveFrom" DATE,
    "effectiveTo" DATE,
    "publishedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "revisionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermitProgramVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regulation" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "citation" TEXT NOT NULL,
    "jurisdiction" "Jurisdiction" NOT NULL,
    "cfrTitle" INTEGER,
    "cfrPart" TEXT,
    "stateId" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Regulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulationVersion" (
    "id" TEXT NOT NULL,
    "regulationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "applicability" JSONB NOT NULL,
    "requirements" JSONB NOT NULL,
    "monitoring" JSONB NOT NULL,
    "testing" JSONB NOT NULL,
    "recordkeeping" JSONB NOT NULL,
    "reporting" JSONB NOT NULL,
    "definitions" JSONB NOT NULL,
    "keySubparts" JSONB,
    "sources" JSONB NOT NULL,
    "relatedCalculators" TEXT[],
    "versionNo" INTEGER NOT NULL,
    "status" "VersionStatus" NOT NULL DEFAULT 'DRAFT',
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "verification" "Verification" NOT NULL DEFAULT 'UNVERIFIED',
    "effectiveFrom" DATE,
    "effectiveTo" DATE,
    "publishedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "revisionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegulationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulationRelation" (
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'related',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RegulationRelation_pkey" PRIMARY KEY ("fromId","toId")
);

-- CreateTable
CREATE TABLE "GlossaryTerm" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "GlossaryTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlossaryTermVersion" (
    "id" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "abbr" TEXT,
    "definition" TEXT NOT NULL,
    "cites" JSONB NOT NULL,
    "related" TEXT[],
    "links" JSONB,
    "versionNo" INTEGER NOT NULL,
    "status" "VersionStatus" NOT NULL DEFAULT 'DRAFT',
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "verification" "Verification" NOT NULL DEFAULT 'UNVERIFIED',
    "effectiveFrom" DATE,
    "effectiveTo" DATE,
    "publishedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "revisionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlossaryTermVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewTask" (
    "id" TEXT NOT NULL,
    "kind" "ReviewKind" NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'OPEN',
    "entityType" "ContentEntity" NOT NULL,
    "entityId" TEXT NOT NULL,
    "versionId" TEXT,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "assigneeId" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "workspaceId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT,
    "replyEmail" TEXT,
    "pageUrl" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ErrorReportStatus" NOT NULL DEFAULT 'NEW',
    "reviewTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Source_url_key" ON "Source"("url");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialDomain_domain_key" ON "OfficialDomain"("domain");

-- CreateIndex
CREATE INDEX "SourceSnapshot_sourceId_retrievedAt_idx" ON "SourceSnapshot"("sourceId", "retrievedAt");

-- CreateIndex
CREATE INDEX "Citation_sourceId_idx" ON "Citation"("sourceId");

-- CreateIndex
CREATE INDEX "Citation_stateProfileVersionId_idx" ON "Citation"("stateProfileVersionId");

-- CreateIndex
CREATE INDEX "Citation_agencyVersionId_idx" ON "Citation"("agencyVersionId");

-- CreateIndex
CREATE INDEX "Citation_programVersionId_idx" ON "Citation"("programVersionId");

-- CreateIndex
CREATE INDEX "Citation_regulationVersionId_idx" ON "Citation"("regulationVersionId");

-- CreateIndex
CREATE INDEX "Citation_glossaryVersionId_idx" ON "Citation"("glossaryVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "State_code_key" ON "State"("code");

-- CreateIndex
CREATE UNIQUE INDEX "State_slug_key" ON "State"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "StateProfileVersion_stateId_versionNo_key" ON "StateProfileVersion"("stateId", "versionNo");

-- CreateIndex
CREATE UNIQUE INDEX "RegulatoryAgency_slug_key" ON "RegulatoryAgency"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyVersion_agencyId_versionNo_key" ON "AgencyVersion"("agencyId", "versionNo");

-- CreateIndex
CREATE UNIQUE INDEX "PermitProgram_slug_key" ON "PermitProgram"("slug");

-- CreateIndex
CREATE INDEX "PermitProgram_stateId_isOilAndGas_position_idx" ON "PermitProgram"("stateId", "isOilAndGas", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PermitProgramVersion_programId_versionNo_key" ON "PermitProgramVersion"("programId", "versionNo");

-- CreateIndex
CREATE UNIQUE INDEX "Regulation_slug_key" ON "Regulation"("slug");

-- CreateIndex
CREATE INDEX "Regulation_cfrTitle_cfrPart_idx" ON "Regulation"("cfrTitle", "cfrPart");

-- CreateIndex
CREATE UNIQUE INDEX "RegulationVersion_regulationId_versionNo_key" ON "RegulationVersion"("regulationId", "versionNo");

-- CreateIndex
CREATE UNIQUE INDEX "GlossaryTerm_slug_key" ON "GlossaryTerm"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GlossaryTermVersion_termId_versionNo_key" ON "GlossaryTermVersion"("termId", "versionNo");

-- CreateIndex
CREATE INDEX "ReviewTask_status_kind_idx" ON "ReviewTask"("status", "kind");

-- CreateIndex
CREATE INDEX "ReviewTask_entityType_entityId_idx" ON "ReviewTask"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ErrorReport_reviewTaskId_key" ON "ErrorReport"("reviewTaskId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "RegulatoryAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficialDomain" ADD CONSTRAINT "OfficialDomain_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceSnapshot" ADD CONSTRAINT "SourceSnapshot_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_stateProfileVersionId_fkey" FOREIGN KEY ("stateProfileVersionId") REFERENCES "StateProfileVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_agencyVersionId_fkey" FOREIGN KEY ("agencyVersionId") REFERENCES "AgencyVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "PermitProgramVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_regulationVersionId_fkey" FOREIGN KEY ("regulationVersionId") REFERENCES "RegulationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_glossaryVersionId_fkey" FOREIGN KEY ("glossaryVersionId") REFERENCES "GlossaryTermVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateProfileVersion" ADD CONSTRAINT "StateProfileVersion_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateProfileVersion" ADD CONSTRAINT "StateProfileVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateProfileVersion" ADD CONSTRAINT "StateProfileVersion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulatoryAgency" ADD CONSTRAINT "RegulatoryAgency_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyVersion" ADD CONSTRAINT "AgencyVersion_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "RegulatoryAgency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyVersion" ADD CONSTRAINT "AgencyVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyVersion" ADD CONSTRAINT "AgencyVersion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitProgram" ADD CONSTRAINT "PermitProgram_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitProgram" ADD CONSTRAINT "PermitProgram_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "RegulatoryAgency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitProgramVersion" ADD CONSTRAINT "PermitProgramVersion_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PermitProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitProgramVersion" ADD CONSTRAINT "PermitProgramVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitProgramVersion" ADD CONSTRAINT "PermitProgramVersion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulationVersion" ADD CONSTRAINT "RegulationVersion_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "Regulation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulationVersion" ADD CONSTRAINT "RegulationVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulationVersion" ADD CONSTRAINT "RegulationVersion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulationRelation" ADD CONSTRAINT "RegulationRelation_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Regulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulationRelation" ADD CONSTRAINT "RegulationRelation_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Regulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlossaryTermVersion" ADD CONSTRAINT "GlossaryTermVersion_termId_fkey" FOREIGN KEY ("termId") REFERENCES "GlossaryTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlossaryTermVersion" ADD CONSTRAINT "GlossaryTermVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlossaryTermVersion" ADD CONSTRAINT "GlossaryTermVersion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTask" ADD CONSTRAINT "ReviewTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTask" ADD CONSTRAINT "ReviewTask_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorReport" ADD CONSTRAINT "ErrorReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorReport" ADD CONSTRAINT "ErrorReport_reviewTaskId_fkey" FOREIGN KEY ("reviewTaskId") REFERENCES "ReviewTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
