import { NativeModule, requireNativeModule } from 'expo';

declare class MyLocalModule extends NativeModule<{}> {}

export default requireNativeModule<MyLocalModule>('MyLocalModule');
