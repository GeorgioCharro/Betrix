import { Logo, LogoImage, LogoText } from '@/components/logo';

interface MenuItem {
  title: string;
  links: {
    text: string;
    url: string;
  }[];
}

interface Footer2Props {
  logo?: {
    url: string;
    src: string;
    alt: string;
    title: string;
  };
  tagline?: string;
  menuItems?: MenuItem[];
  copyright?: string;
  bottomLinks?: {
    text: string;
    url: string;
  }[];
}

function Footer2({
  logo = {
    src: '/logo.png',
    alt: 'Betrix Logo',
    title: '',
    url: '/',
  },
  tagline = 'Gambling made easy.',
  menuItems = [
    {
      title: 'Navigation',
      links: [
        { text: 'Home', url: '/' },
        { text: 'Casino', url: '/casino/home' },
        { text: 'My Bets', url: '/casino/my-bets' },
        { text: 'Challenges', url: '/casino/challenges' },
        { text: 'Provably Fair', url: '/provably-fair/calculation' },
      ],
    },
    {
      title: 'Games',
      links: [
        { text: 'Dice', url: '/casino/games/dice' },
        { text: 'Roulette', url: '/casino/games/roulette' },
        { text: 'Mines', url: '/casino/games/mines' },
        { text: 'Keno', url: '/casino/games/keno' },
        { text: 'Plinkoo', url: '/casino/games/plinkoo' },
      ],
    },
  ],
  copyright = '©2025 Betrix All rights reserved.',
  bottomLinks = [
    { text: 'Terms and Conditions', url: '#' },
    { text: 'Privacy Policy', url: '#' },
  ],
}: Footer2Props): JSX.Element {
  return (
    <section className="py-32 bg-brand-stronger">
      <div className="container">
        <footer>
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-6">
            <div className="col-span-2 mb-8 lg:mb-0">
              <div className="flex items-center gap-2 lg:justify-start">
                <Logo url={logo.url}>
                  <LogoImage
                    alt={logo.alt}
                    className="size-[100px]"
                    src={logo.src}
                    title={logo.title}
                  />
                  <LogoText className="text-xl">{logo.title}</LogoText>
                </Logo>
              </div>
              <p className="mt-4 font-bold">{tagline}</p>
            </div>

            {menuItems.map(section => (
              <div key={section.title}>
                <h3 className="mb-4 font-bold">{section.title}</h3>
                <ul className="text-muted-foreground space-y-4">
                  {section.links.map(link => (
                    <li
                      className="hover:text-primary font-medium"
                      key={link.url + link.text}
                    >
                      <a href={link.url}>{link.text}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-muted-foreground mt-24 flex flex-col justify-between gap-4 border-t pt-8 text-sm font-medium md:flex-row md:items-center">
            <p>{copyright}</p>
            <ul className="flex gap-4">
              {bottomLinks.map(link => (
                <li
                  className="hover:text-primary underline"
                  key={link.url + link.text}
                >
                  <a href={link.url}>{link.text}</a>
                </li>
              ))}
            </ul>
          </div>
        </footer>
      </div>
    </section>
  );
}

export { Footer2 };
