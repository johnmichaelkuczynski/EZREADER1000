import { Link } from 'wouter';

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 py-4 mt-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
          <div>© {new Date().getFullYear()} EZ Reader. All rights reserved.</div>
          <div className="flex gap-4 mt-2 md:mt-0">
            <Link href="#" className="hover:text-primary transition-colors">
              Terms
            </Link>
            <Link href="#" className="hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link href="#" className="hover:text-primary transition-colors">
              Help
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
