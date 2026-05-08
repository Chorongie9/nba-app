import { useNavigate, Link } from 'react-router-dom';
import SearchBar from './SearchBar';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const handleSearch = (id, name) => navigate(`/player/${id}?name=${encodeURIComponent(name)}`);

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 border-b border-zinc-900">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-8">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <span className="font-display font-bold text-lg tracking-widest uppercase text-zinc-50 group-hover:text-zinc-300 transition-colors">
              NBA Stats
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          </Link>
          <SearchBar searchPlayer={handleSearch} dark />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  );
};

export default Layout;
