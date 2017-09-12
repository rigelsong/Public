describe("First jasmine suite",function() {
    var obj, dog;
    var testObj;

    beforeEach(function(){
        obj = {bar : 1};
        dog = obj;
    })

    afterEach(()=>{
        obj = {};
    })

    it("checks constructed object",()=> {
    	this.foo = 'bar';
        testObj =  new someObj(1,2,3);
        // spyOn(testObj,"doSomething");
        testObj.doSomething = jasmine.createSpy("mockDoSomething").and.callFake(function(){
            return 'hotjuicyvagina';
        })

        expect(testObj.doSomething()).toEqual('hotjuicyvagina');
        expect(testObj.someFn()).toEqual([1,2,3]);
        expect(this).not.toEqual({});
        expect(dog).toBe(obj);
        // expect(obj).toEqual({bar : 1,k:2});
    })

    xit("checks for something",()=> {
        expect().toEqual();
    })
})
