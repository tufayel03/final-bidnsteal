import { OrderModal } from './OrderModal';
import { UserModal } from './UserModal';
import { MiscModals } from './MiscModals';

export function AdminModals() {
    return (
        <>
            <OrderModal />
            <UserModal />
            <MiscModals />
        </>
    );
}
