import { Layout } from "../Layout";

export interface ServerTimeProps {
  error?: string;
}

export const ListingEdit = ({ error }: ServerTimeProps) => {
  // const currentTime = new Date().toISOString();

  return (
    // <Layout title="Edit Listing ">
    <>
      {/* <h2>Edit Listing</h2> */}
      <form id="clientForm">
        {/* <label for="name">Name:</label>
  <input type="text" id="name" name="name" required>

  <label for="email">Email:</label>
  <input type="email" id="email" name="email" required>


  <button type="submit">Submit</button> */}
        <label for="name">Name:</label>
        <input type="text" id="name" name="name" />

        <label for="email">Email:</label>
        <input type="email" id="email" name="email" />
        <button type="submit">Submit</button>
      </form>
      <form
        id="clientForm"
        style="display:flex;flex-direction:column;height:600px;justify-content:space-between"
      >
        <input type="text" id="id" placeholder="ID" />
        <input type="email" id="contactEmail" placeholder="Contact Email" />
        <input type="text" id="contactPhone" placeholder="Contact Phone" />
        <input type="text" id="name" placeholder="Name" />
        <textarea id="description" placeholder="Description"></textarea>
        <input type="text" id="colorPrimary" placeholder="Color Primary" />
        <input type="text" id="colorSecondary" placeholder="Color Secondary" />
        <input type="text" id="urlPathname" placeholder="URL Pathname" />
        <input type="text" id="logoUrl" placeholder="Logo URL" />
        <input type="text" id="bannerPhotoUrl" placeholder="Banner Photo URL" />
        <button type="submit">Submit</button>
      </form>
      <div id="errorMessages"></div>
    </>
    // </Layout>
  );
};
