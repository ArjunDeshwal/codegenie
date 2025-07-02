import {useTRPC} from "@/trpc/client"
const Home=async()=> {
  const trpc=useTRPC();
  trpc.hello.query
  return (
    <div>

    </div>
  );
}

export default Home
