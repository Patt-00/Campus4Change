import novice from '../assets/1.png';
import intermediate from '../assets/2.png';
import expert from '../assets/3.png';

const slides = [
  {
    level: 'For the Novice',
    accent: 'var(--green)',
    title: 'Learn the basics with a tutor who gets it.',
    text:'Find a tutor who explains topics clearly, and manage sessions around your schedule.',
    image: novice,
  },
  {
    level: 'For Intermediates',
    accent: 'var(--yellow)',
    title: 'Eager to learn more? Keep learning with a study group.',
    text: 'Join groups, share notes, and book a session when you get stuck.',
    image: intermediate,
  },
  {
    level: 'For Experts',
    accent: 'var(--purple)',
    title: 'Share what you know as a tutor.',
    text: 'Lead groups, tutor your peers, and build your reputation across campus.',
    image: expert,
  },
];

export default slides;
