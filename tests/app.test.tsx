import { render, screen } from '@testing-library/react';
import App from '../src/App';

test('App renderizza il titolo AurorApp', () => {
  render(<App />);
  expect(screen.getByText(/AurorApp/)).toBeInTheDocument();
});
