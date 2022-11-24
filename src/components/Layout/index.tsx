import React, { ReactNode } from 'react';

import dynamic from 'next/dynamic';

import styles from './Layout.module.scss';

const NavigationBar = dynamic(() => import('../NavigationBar'), { ssr: false });
interface Props {
  children: ReactNode;
}

const Layout = ({ children }: Props) => {
  return (
    <div className={styles.container}>
      <NavigationBar />
      {children}
      <footer></footer>
    </div>
  );
};

export default Layout;
