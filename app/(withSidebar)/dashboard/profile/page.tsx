import {ProfileWorkspace} from './workspace';

export const metadata = {
  title: 'პროფილი · engineers.ge',
  description: 'მომხმარებლის პროფილის მართვა'
};

export default function ProfilePage() {
  return (
    <div className="mx-auto w-full max-w-[920px] px-4 py-8 md:px-5 md:py-10">
      <ProfileWorkspace />
    </div>
  );
}
