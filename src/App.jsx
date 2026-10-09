import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ShopsProvider } from './context/ShopsContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { VisitsProvider } from './context/VisitsContext';
import { LanguageProvider } from './context/LanguageContext';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';

const Home = lazy(() => import('./pages/Home'));
const Explore = lazy(() => import('./pages/Explore'));
const ShopDetail = lazy(() => import('./pages/ShopDetail'));
const MapPage = lazy(() => import('./pages/MapPage'));
const NearMe = lazy(() => import('./pages/NearMe'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Profile = lazy(() => import('./pages/Profile'));
const AddShop = lazy(() => import('./pages/AddShop'));
const Admin = lazy(() => import('./pages/Admin'));
const MyShop = lazy(() => import('./pages/MyShop'));
const Auth = lazy(() => import('./pages/Auth'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const News = lazy(() => import('./pages/News'));
const Article = lazy(() => import('./pages/Article'));
const Events = lazy(() => import('./pages/Events'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const Passport = lazy(() => import('./pages/Passport'));
const Gear = lazy(() => import('./pages/Gear'));
const Feedback = lazy(() => import('./pages/Feedback'));
const BestCoffeeMunich = lazy(() => import('./pages/BestCoffeeMunich'));
const About = lazy(() => import('./pages/About'));
const Privacy = lazy(() => import('./pages/StaticPages').then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/StaticPages').then((m) => ({ default: m.Terms })));
const Impressum = lazy(() => import('./pages/StaticPages').then((m) => ({ default: m.Impressum })));

function RouteFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)] animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <SplashScreen />
      <AuthProvider>
        <ShopsProvider>
          <FavoritesProvider>
            <VisitsProvider>
              <BrowserRouter>
                <Layout>
                  <Suspense fallback={<RouteFallback />}>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/explore" element={<Explore />} />
                      <Route path="/explore/:citySlug" element={<Explore />} />
                      <Route path="/guides/best-coffee-shops-munich" element={<BestCoffeeMunich />} />
                      <Route path="/shop/:slug" element={<ShopDetail />} />
                      <Route path="/map" element={<MapPage />} />
                      <Route path="/near-me" element={<NearMe />} />
                      <Route path="/favorites" element={<Favorites />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/add-shop" element={<AddShop />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/my-shop" element={<MyShop />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/onboarding" element={<Onboarding />} />
                      <Route path="/news" element={<News />} />
                      <Route path="/news/:slug" element={<Article />} />
                      <Route path="/events" element={<Events />} />
                      <Route path="/events/:slug" element={<EventDetail />} />
                      <Route path="/passport" element={<Passport />} />
                      <Route path="/gear" element={<Gear />} />
                      <Route path="/feedback" element={<Feedback />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/verify-email" element={<VerifyEmail />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/impressum" element={<Impressum />} />
                    </Routes>
                  </Suspense>
                </Layout>
              </BrowserRouter>
            </VisitsProvider>
          </FavoritesProvider>
        </ShopsProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
