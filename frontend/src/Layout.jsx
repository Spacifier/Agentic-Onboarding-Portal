import Header from "./components/Common/Header";
import Footer from "./components/Common/Footer";
import { Outlet } from "react-router-dom";

function Layout(){

    return (
      <>
        <Header />
        <Outlet />
        <Footer />
      </>
    );
}

export default Layout