import { Outlet } from 'react-router-dom';
import { AppShell } from '@mantine/core';
import Navbar from './Navbar';

export default function Layout() {
    return (
        <AppShell
            header={{ height: 60 }}
            padding="md"
        >
            <AppShell.Header>
                <Navbar />
            </AppShell.Header>
            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    );
}
