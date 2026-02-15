import { createBrowserRouter } from 'react-router';
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import MapView from './pages/MapView';
import NotFound from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Home,
  },
  {
    path: '/search',
    Component: SearchResults,
  },
  {
    path: '/map',
    Component: MapView,
  },
  {
    path: '*',
    Component: NotFound,
  },
]);
