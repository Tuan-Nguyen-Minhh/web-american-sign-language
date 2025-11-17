import PageHeading from "./PageHeading";

export default function Home() {
  return (
    <div className="home-container">
      <PageHeading title="American Sign Language Recognition!">
        Use our deep learning model to recognize hand gestures in real-time.
        Simply allow camera access and show ASL gestures to the camera!
      </PageHeading>
    </div>
  );
}
