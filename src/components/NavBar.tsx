"use client";

import LanguageSwitch from "./Language";
import LoginDialog from "./Login";
import Link from "next/link";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { useTranslation } from "react-i18next";

const NavBar = () => {
  const { publicInfo } = usePublicInfo();
  const { t } = useTranslation();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo and Title */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {publicInfo?.sitename || "Monitor"}
            </span>
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <LanguageSwitch />

          {publicInfo?.private_site ? (
            <LoginDialog
              autoOpen={publicInfo?.private_site}
              info={t('common.private_site')}
              onLoginSuccess={() => { window.location.reload(); }}
            />
          ) : (
            <LoginDialog />
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
