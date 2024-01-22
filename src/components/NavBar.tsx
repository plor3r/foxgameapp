import {Link} from '@mui/material';
import { SuiConnect } from "./SuiConnect";
import { NETWORK } from "../config";

export function NavBar() {
  return (
    <nav className="navbar py-4 px-4">
      <div className="flex-1 text-lg font-semibold">
        <Link href="/">
          <div className="title cursor-pointer" style={{ fontSize: "24px" }}>Fox Game</div>
        </Link>
          <div className="cursor-pointer ml-2 text-red title-upper" style={{ fontSize: "14px" }}>Sui {NETWORK}</div>
        <ul className="menu menu-horizontal p-0 ml-5">
          <li className="font-sans text-lg">
            <Link href='/game'>Play</Link>
          </li>
          <li className="font-sans text-lg">
            <Link href="/whitepapers" target="_blank">Whitepapers</Link>
          </li>
          <li className="font-sans text-lg">
            <Link href="https://github.com/plor3r" target="_blank">Source Code</Link>
          </li>
        </ul>
      </div>
      <SuiConnect />
    </nav>
  );
}
