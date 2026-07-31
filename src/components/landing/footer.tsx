import Image from "next/image";
import { navigationLinks } from "./content";
import { pageShellClass } from "./ui-classes";

const linkClass = "transition-colors hover:text-ink-crimson";

export function Footer() {
  return (
    <footer className="border-t border-ink-line pt-[26px] pb-[38px] max-[720px]:pb-[30px]">
      <div
        className={`${pageShellClass} grid grid-cols-[minmax(190px,1fr)_auto] items-center gap-x-[50px] gap-y-5 max-[720px]:grid-cols-1 max-[720px]:gap-[22px]`}
      >
        <div>
          <a className="inline-flex" href="#home" aria-label="Inkwell home">
            <Image
              src="/images/inkwell.png"
              alt="Inkwell"
              width={200}
              height={75}
              className="h-auto w-[102px]"
            />
          </a>
          <p className="mt-2 mb-0 text-[0.7rem] text-ink-muted">
            © {new Date().getFullYear()} Inkwell. All rights reserved.
          </p>
        </div>

        <nav
          className="flex gap-[34px] text-[0.78rem] font-semibold max-[720px]:grid max-[720px]:grid-cols-2 max-[720px]:gap-x-[26px] max-[720px]:gap-y-3.5"
          aria-label="Footer navigation"
        >
          {navigationLinks.map((link) => (
            <a className={linkClass} key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          <a className={linkClass} href="/login">
            Sign in
          </a>
        </nav>

        <div className="col-start-2 flex justify-end gap-6 text-[0.68rem] text-ink-muted max-[720px]:col-start-1 max-[720px]:justify-start">
          <a className={linkClass} href="/privacy">
            Privacy
          </a>
          <a className={linkClass} href="/terms">
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}
