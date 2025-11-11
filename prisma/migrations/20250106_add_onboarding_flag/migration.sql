-- Create onboarding completion flag on users so the forced onboarding flow can persist state.
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
