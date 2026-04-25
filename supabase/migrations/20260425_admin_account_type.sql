-- Ajout du champ admin sur les profils
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin boolean DEFAULT false NOT NULL;

-- Ajout du type de compte : 'freelance' (utilisateurs SaaS) ou 'client' (clients des freelances)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'freelance' NOT NULL
    CONSTRAINT profiles_account_type_check CHECK (account_type IN ('freelance', 'client'));
