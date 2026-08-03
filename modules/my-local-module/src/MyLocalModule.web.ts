import { registerWebModule, NativeModule } from 'expo';

class MyLocalModule extends NativeModule<{}> {}

export default registerWebModule(MyLocalModule, 'MyLocalModule');
