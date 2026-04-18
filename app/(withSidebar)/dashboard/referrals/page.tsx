import {ReferralsWorkspace} from './workspace';

export const metadata = {
  title: 'მოწვევები · engineers.ge',
  description: 'მოიწვიე ინჟინერი კოლეგები და მიიღე გასამრჯელო'
};

export default function ReferralsPage() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-8 md:px-5 md:py-10">
      <ReferralsWorkspace />
    </div>
  );
}
