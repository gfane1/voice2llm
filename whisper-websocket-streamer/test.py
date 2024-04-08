import concurrent.futures
import os
import time
import random
import asyncio
import multiprocessing



# Function to be executed in a different process
def process_function(arg, shared_list):
    print(f"Executing process_function in process {os.getpid()} with argument {arg}")
    print(shared_list)
    shared_list.append(random.random())
    time.sleep(random.random())
   # print(f"DONE Executing process_function in process {os.getpid()} with argument {arg}")
    return arg * 2

if __name__ == "__main__":
	
	manager = multiprocessing.Manager()
	shared_list = manager.dict()
	
	async def f1(shared_list):
		while True:
			print("F1", shared_list)
			await asyncio.sleep(0.1) #random.randint(0,3))
			
	# async def f2():
		# while True:
			# print("F2")
			# await asyncio.sleep(1) #random.randint(0,3))
	
	async def kill():
		await asyncio.sleep(4)
		console.log("KILL", shared_list)
		
		
		
	async def demo(shared_list):
		args = [1, 2, 3, 4, 5]
		with concurrent.futures.ProcessPoolExecutor(max_workers=4) as executor:
			while True and shared_list['stop'] != True:
				future_results = {executor.submit(process_function, arg, shared_list): arg for arg in args}
				# print("ITER", future_results)
				#break
				# Get the results as they become available
				for future in concurrent.futures.as_completed(future_results):
					arg = future_results[future]
					if arg == 3:
						shared_list['stop'] = True
					try:
						result = future.result()
						print(f"Result for argument {arg}: {result}")
						await asyncio.sleep(0.1)	
					except Exception as e:
						print(f"Exception occurred for argument {arg}: {e}")
			print("DONE RESULTS")
			await asyncio.sleep(0.1)		
			print("NEXT ROUND")		
	
	async def main():
		await asyncio.gather(f1(shared_list),demo(shared_list))
	
	asyncio.run(main())
